## Cost Design

Cost savings for a solo-dev project are key, so exposure to billing comes naturally

VPC endpoints are the number one killer for private subnet VPC (still less $ than going with NAT which is also less secure/controlled)
There's an hourly cost per interface VPCE per AZ. At minimum, an architecture with end to end observability and cicd needs at least 6 VPCE
(ecr-api, ecr-dkr, logs, aps, xray, ssm) s3 gateway vpce does not incur cost. To save costs, during development only one of these VPCEs
would be deployed in a single AZ (in a production system you would want at least 2). This divides running costs by 2. Then after developing,
I automate destroying these 6 VPCE so it doesn't charge for being up while I'm not working.

ECS tasks are the next point of contention. For development, I enable only 1 task single AZ per microservice. When I'm done developing, I
run a script to put the desired counts of these tasks to 0. I also use the smallest ECS cpu/mem I can (I still need 1024mb RAM to account for adot and service connect
sidecars so unfortunately I can't lower it to 512 as Java would not have the JVM memory for heap/non-heap overhead needed even for a single task distributed). I do run
0.5 vCPU that's shared between the 3 containers. I have CPU scaling in place for demoing load tests but I can still push my services to handle 150+ RPS with low P99  
~ double git ms latency (includes calling other microservices/resources). If it does exceed what these small tasks are capable of, it will auto scaling during these load tests.
These ecs task configs are easily modifiable for a production setting but my load tests squeeze performance as much as possible from just 1 task per microservice.
Since the architecture is so portable, I'm able to destroy the edge ALB to further lower idle cost- but I keep it on as
this takes too long to destroy and bring back up, plus needing to destroy gateway as the VPC Link has a dependency on the ALB listener but for long periods
of non AWS work, I will destroy it along with the entire VPC itself to save additional cost.

For Observability, cost is negligible for Cloudwatch ingestion as storage as I've designed my services to only log.info user meta data 1:1 per request,
and their potential 4xx/5xx exception types. When load-testing and stressing the system, X-ray trace ingestion can start to accumulate high costs, to prevent this
edge entry services behind ALB + Gateway set a sampling rate of 10%. This appends -00 90% of the time to the w3c parent trace http header value and lets downstream automatically
know not to push these traces to adot collector's x ray processor path. For portability, cost of keeping Prometheus and Grafana workspaces up as idle doesn't incur much cost
so I keep those up even if all other stacks are down as workspaces take potentially 20 minutes+ to bring back up.

For sleep and wake scripts refer to [ops/README.md](ops/README.md)

---