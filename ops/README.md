### In order to save costs while developing

NOTE: must run these from project root.

---
sleep-services.sh: ecs service desired counts to 0
sleep-data.sh: Destroy persistent data layers (RDS, Dynamo, etc)
sleep-infra.sh: Destroy VPC interface endpoints

sleep.sh: runs everything in order safely

----

wake-services.sh: ecs service desired counts to 0
wake-infra.sh: Destroy VPC interface endpoints

wake.sh: runs everything in order safely

---

load-test-start.sh: invokes lambda to start K6 runner on an ECS Fargate Spot task with custom number of virtual users, sleepIntervalMs