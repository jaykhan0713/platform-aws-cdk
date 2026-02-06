//This would be a contract and published by Network boundary
export const NetworkExports = {
    vpcId: 'vpc-id',
    vpcCidr: 'vpc-cidr',
    vpcLinkId: 'vpc-link-id',

    privateIsolatedSubnetId: (index: number) => `private-isolated-subnet-${index}-id`,
    privateIsolatedSubnetAz: (index: number) => `private-isolated-subnet-${index}-az`
} as const