import { registerEnumType } from "@nestjs/graphql";

export enum Interests {
    ENVIRONMENT_SUSTAINABILITY = "Building environmentally sustainable futures",
    GENDER_EQUALITY = "Gender Equality",
    BEAUTY_AND_FASHION = "Beauty & fashion",
    BUSINESS_AND_SOCIAL_INNOVATION = "Business & Social Innovation",
    MONEY_AND_WEALTH_BUILDING = "Money & Wealth Building",
    HEALTH_AND_WELLBEING = "Health and WellBeing",
    ART_AND_CULTURE = "Art & Culture",
    DEVELOPMENT_AND_IMPACT = "Development & Impact",
    PROFESSIONAL_DEVELOPMENT = "Professional Development",
    ENTREPRENEURSHIP = "Entrepreneurship",
}

registerEnumType(Interests, {
  name: 'Interests',
});