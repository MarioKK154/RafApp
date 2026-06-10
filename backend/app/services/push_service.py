import os
import json
import logging
from pywebpush import webpush, WebPushException
from typing import List
from .. import models
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Usually you'd load VAPID keys from environment variables.
# We will use dummy keys or a generated keypair.
# You can generate one via `vapid --gen` or python pywebpush.
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "uO-P0r5k0t8O_y_pX_L1s3t_O3uL9K2v0N0r4l0q0M0")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "BG-K9t1u9m6M1M_x0l_I2N9o7N0x_m9n8T_Q1l3p_S0v0N0r4l0q0M0w0P_K8N3o_")
VAPID_CLAIMS = {
    "sub": "mailto:admin@rafapp.is"
}

def send_web_push(subscription_info: dict, payload: str):
    """
    Send a push notification to a single browser.
    subscription_info = {
        "endpoint": "https://...",
        "keys": {
            "p256dh": "...",
            "auth": "..."
        }
    }
    """
    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
    except WebPushException as ex:
        logger.error(f"Web push failed: {repr(ex)}")
        if ex.response and ex.response.json():
            logger.error(ex.response.json())
        # Return False to indicate failure (maybe delete subscription)
        return False
    return True

def notify_user(db: Session, user_id: int, title: str, body: str, url: str = "/"):
    """
    Fetches all push subscriptions for a user and dispatches a Web Push Notification.
    """
    subscriptions = db.query(models.PushSubscription).filter(models.PushSubscription.user_id == user_id).all()
    if not subscriptions:
        return
        
    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url
    })
    
    dead_subs = []
    
    for sub in subscriptions:
        sub_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth
            }
        }
        success = send_web_push(sub_info, payload)
        if not success:
            dead_subs.append(sub)
            
    # Clean up invalid/expired subscriptions
    for dead in dead_subs:
        db.delete(dead)
    
    if dead_subs:
        db.commit()
