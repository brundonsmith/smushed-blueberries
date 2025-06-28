
const correctSecret = process.env.SECURITY_QUESTION_SECRET;

const normalize = (secret: string) => secret.trim().toLocaleLowerCase()

export const isValid = (secret: string) =>
    correctSecret && normalize(correctSecret) === normalize(secret)