export const validatePassword = (password: string) => {
    const errors = [];
    
    if (password.length < 8) {
        errors.push("be at least 8 characters"); 
    }

    if (password.search(/[a-z]/i) < 0) {
        errors.push("contain at least one letter.");
    }

    if (password.search(/[0-9]/) < 0) {
        errors.push("contain at least one digit."); 
    }

    return {
        valid: Boolean(!errors.length),
        errors
    };
}