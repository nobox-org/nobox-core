import { throwBadRequest } from "@/utils/exceptions";

type ClassValidatorType = { validation: (arg: any) => boolean, message: string };

const assertValidation = (validation: ClassValidatorType, value: any, name: string) => {
    const validationPassed = validation.validation(value);
    if (!validationPassed) {
        throwBadRequest(`${name} ${validation.message}`);
    }
}

export const validateInBulk = (validation: ClassValidatorType | ClassValidatorType[], valueObj: Record<any, any>) => {
    const values = Object.keys(valueObj);
    for (let index = 0; index < values.length; index++) {
        const name = values[index];
        const value = valueObj[name];
        if (Array.isArray(validation)) {
            for (let i = 0; i < validation.length; i++) {
                const eachValidation = validation[i];
                assertValidation(eachValidation, value, name);
            }
        } else { assertValidation(validation, value, name); }
    }
}

