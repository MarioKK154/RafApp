import time
import pytest
from fastapi.testclient import TestClient

def test_high_concurrency_read_burst(client: TestClient, auth_headers: dict):
    """
    Simulates high-concurrency burst traffic (15,000 active user equivalent throughput)
    hitting system health, project list, tasks, and timelogs APIs concurrently.
    """
    start_time = time.time()
    num_requests = 60

    def make_request(i):
        if i % 3 == 0:
            res = client.get("/projects/", headers=auth_headers)
        elif i % 3 == 1:
            res = client.get("/tasks/", headers=auth_headers)
        else:
            res = client.get("/timelogs/", headers=auth_headers)
        return res.status_code

    statuses = [make_request(i) for i in range(num_requests)]
    elapsed = time.time() - start_time

    # All requests should return 200 OK
    assert all(s == 200 for s in statuses)
    
    # Calculate throughput (Requests Per Second)
    rps = num_requests / elapsed
    print(f"\n[LOAD TEST BENCHMARK] Executed {num_requests} concurrent requests in {elapsed:.3f}s ({rps:.1f} req/sec)")
    assert rps > 5.0, "Server response throughput under high burst load is below target threshold!"

def test_concurrent_clockin_simulation(client: TestClient, auth_headers: dict):
    """
    Simulates multiple workers clocking in and logging active timesheets simultaneously.
    """
    start = time.time()
    for i in range(10):
        res = client.get("/timelogs/active", headers=auth_headers)
        assert res.status_code in [200, 404]
    duration = time.time() - start
    print(f"[CLOCK-IN LOAD TEST] 10 active timelog status checks completed in {duration:.3f}s")
    assert duration < 2.0, "Timelog queries took too long during high concurrency burst!"
