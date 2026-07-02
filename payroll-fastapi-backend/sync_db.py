import json
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from main import seed_database

def run_sync():
    config_path = os.path.join("data", "workflow_config.json")
    if not os.path.exists(config_path):
        print(f"Error: {config_path} not found.")
        sys.exit(1)

    with open(config_path, "r") as f:
        config = json.load(f)

    db = SessionLocal()
    try:
        db_config = db.query(models.WorkflowConfig).filter(models.WorkflowConfig.key == "active_config").first()
        if db_config:
            db_config.config = config
            print("Successfully updated database 'workflow_config' table with local JSON configuration.")
        else:
            db_config = models.WorkflowConfig(key="active_config", config=config)
            db.add(db_config)
            print("Successfully initialized database 'workflow_config' table with local JSON configuration.")
        db.commit()
        
        # Synchronize and seed the users table from the config
        seed_database(db)
        print("🎉 Database successfully synchronized! All users are now updated in the DB.")
    except Exception as e:
        db.rollback()
        print("ERROR occurred during sync:", e)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_sync()
