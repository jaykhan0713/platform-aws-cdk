## Security

Security is handled tightly across the architecture via SG ingress, egress and Cognito Auth at the Gateway.

internal microservices communicate via service connect which can use mTLS so service to service certificates are automatically handled by ECS. 
Each microservice is given a Service Connect Envoy container sidecar automatically.
For this portfolio, mTLS is expensive so only having services in private subnets with VPCE is sufficient, you would add mtls for defense-in-depth.

### TLS
TLS is terminated at API gateway AND again at ALB. API gw -> TLS to ALB. ALB listens on HTTPS port 443, terminates TLS.
Custom Route 53 domain is used. ACM cert is used by ALB so API gw can invoke a TLS connection to ALB via secureServerName in integrations.
Same Route 53 can be used for custom domain name with an additional ACM cert so you don't have to hit AWS prebuild execute-API (which still manages it's own cert).
<b>Note</b>: you must purchase a route 53 domain manually from AWS and use it, otherwise by default you just get prebuild execute-API and no

### VPC Private Subnet with VPC endpoints (No NAT)
All services are deployed on private subnets within the VPC with no egress to internet. Any AWS resources fargate or
containers need are handled via VPC endpoints.

### IAM
IAM roles are tightly scoped to only the ARN resources the role needs access to.

### Security Groups
A security group membership model is used with ECS tasks. The service-runtime stack creates a shared
ECS membership model that is registered to every FargateService (along with a unique task SG). Every FargateService then accepts only ingress
from that security group. This keeps up portability as you can still add a microservice easily. The tradeoff
is this rule technically says any fargate task can talk to any fargate task in the VPC which is not a security issue
but a matter of disciplining outbound calls at the app level.

For services behind ALB, only their unique SG accepts traffic
from the ALB sg.

VPC Link also uses a membership model. The VPC Link is created with an SG who's egress is tightly scoped to only an additional
VPC link membership SG. That VPC membership SG is then added to the ingress of any edge ALB's SG. This is more about ownership
boundaries and keeps portability so that new ALB's can be created without VPC link needing to add a new egress every time.
This ensures either way that the only entry points from the API gateway are the desginated ALB's at the edge.

### Http API Gateway with Cognito
Cognito OAuth2 Authorizers are attached to gateway integrations. Cognito Authentication (SRP or hosted) is used for real users, JWT tokens are issued by
Cognito. User must pass in bearer token to API gateway in order for to verify. 

v1: Gateway then extracts a sub id from the verified token
and propagates to the private subnet internal ALB that as a part of the source of truth for user identity (http header x-user-id)
For users, a cognito managed login web page UserPoolClient is used or can use postman+openid scopes

v2: For defense in depth, each microservice in private subnet can now hit Cognito's idp endpoint via NAT.
For spring microservices, they use SpringSecurity to handle validation against the issuer so API gateway is no longer the source of truth,
where API HW propagates header Authorization Bearer \<access token\> 

For Synthetic load traffic, Http Client Credentials UserPoolClient is used (x-user-id is removed upon entry for security).
A custom scope, client id is stored in SSM for the k6 runner to fetch via parameter key. Client Secret ID is stored in AWS Secret manager.

### ServiceConnect mTLS
Internal services are designed to talk via mTLS (Mutual TLS) so ECS itself handles certs and
you get encrypted transport without having to worry about company HTTPS compliance standards even in private
VPCE. Currently disabled by default for cost savings as private ACM certs range from $400+/mo. 