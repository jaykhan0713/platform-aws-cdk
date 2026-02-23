//This would be a contract and published by Network boundary
export const NetworkExports = {
    vpcId: 'vpc-id',
    vpcCidr: 'vpc-cidr',
    vpcLinkId: 'vpc-link-id',
    vpcLinkSgId: 'vpc-link-sg-id',
    vpcLinkSubSgId: 'vpc-link-sub-sg-id',

    privateIsolatedSubnetId: (index: number) => `private-isolated-subnet-${index}-id`,
    privateIsolatedSubnetAz: (index: number) => `private-isolated-subnet-${index}-az`,
    privateIsolatedSubnetRt: (index: number) => `private-isolated-subnet-${index}-rt`,

    publicSubnetId: (index: number) => `public-subnet-${index}-id`,
    publicSubnetAz: (index: number) => `public-subnet-${index}-az`,
    publicSubnetRt: (index: number) => `public-subnet-${index}-rt`,
} as const