import { registerEnumType } from "@nestjs/graphql";

export enum DiscoverySource {
  SOCIAL_MEDIUM = "Social Media",
  WORD_OF_MOUTH = "Word of mouth",
  OTHERS = "Others",
}

registerEnumType(DiscoverySource, {
  name: 'DiscoverySource',
});