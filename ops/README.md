### In order to save costs while developing

NOTE: must run these from project root.

---
sleep-services.sh: ecs service desired counts to 0
sleep-infra.sh: Destroy VPC interface endpoints

sleep.sh: runs everything in order safely

----

wake-services.sh: ecs service desired counts to 0
wake-infra.sh: Destroy VPC interface endpoints

wake.sh: runs everything in order safely

---