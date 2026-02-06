//This would be a contract and published by Network boundary
export const NetworkExports = {
    vpcId: 'vpc-id',
    vpcCidr: 'vpc-cidr',
    vpcLinkId: 'vpc-link-id',
    vpcLinkSg: 'vpc-link-sg',

    privateIsolatedSubnetId: (index: number) => `private-isolated-subnet-${index}-id`,
    privateIsolatedSubnetAz: (index: number) => `private-isolated-subnet-${index}-az`
} as const