import time

def push_entity(entity_type: str, entity_data: dict, provider: str, api_key: str):
    """
    Mocks an outbound API request to a GC software (Procore, ACC, Ajour).
    """
    # Simulate network latency
    time.sleep(1.5)
    
    # 1. Map to Provider Format
    payload = {}
    if provider == "PROCORE":
        if entity_type == "task":
            payload = {
                "observation": {
                    "title": entity_data.get("title"),
                    "description": entity_data.get("description"),
                    "status": "initiated",
                    "type": "Quality"
                }
            }
        elif entity_type == "timelog":
            payload = {
                "time_card_entry": {
                    "hours": entity_data.get("duration_hours"),
                    "description": entity_data.get("notes"),
                    "date": str(entity_data.get("log_date"))
                }
            }
        elif entity_type == "material":
            payload = {
                "submittal": {
                    "title": f"Material Request: {entity_data.get('name')}",
                    "description": f"Quantity: {entity_data.get('quantity')}"
                }
            }
    
    elif provider == "ACC":
        if entity_type == "task":
            payload = {
                "issue": {
                    "title": entity_data.get("title"),
                    "description": entity_data.get("description"),
                    "status": "open",
                    "issueTypeId": "quality"
                }
            }
        elif entity_type == "timelog":
            payload = {
                "cost_item": {
                    "name": "Labor hours logged",
                    "amount": entity_data.get("duration_hours")
                }
            }
        elif entity_type == "material":
            payload = {
                "rfi": {
                    "title": f"Procurement Request: {entity_data.get('name')}",
                    "question": f"Need approval for {entity_data.get('quantity')} units."
                }
            }

    elif provider == "AJOUR":
        # Ajour System mapping mock
        payload = {
            "AjourEntity": {
                "Type": entity_type,
                "Name": entity_data.get("title", entity_data.get("name", "Unknown")),
                "Value": entity_data.get("duration_hours", entity_data.get("quantity", 1))
            }
        }
    else:
        raise ValueError(f"Unknown provider: {provider}")

    # Return a simulated success response
    return {
        "status": "success",
        "simulated_provider": provider,
        "simulated_payload": payload,
        "message": f"Successfully pushed {entity_type} to {provider}"
    }
