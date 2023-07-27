export const REGIONS = [
  'cn-east-3',
  'af-south-1',
  'cn-north-4',
  'cn-north-1',
  'cn-north-9',
  'cn-east-2',
  'cn-south-1',
  'eu-west-0',
  'eu-west-101',
  'tr-west-1',
  'cn-southwest-2',
  'ap-southeast-2',
  'ap-southeast-3',
  'ae-ad-1',
  'ap-southeast-1',
];

const getHuaweiRegionChoices = (regions) => {
  return regions.map((item) => {
    return {
      label: `modalAddCloudKey.huawei.regionID.${ item.replace(/\-/g, '_') }`,
      value: item
    }
  });
}

export const REGION_CHOICES = getHuaweiRegionChoices(REGIONS);



