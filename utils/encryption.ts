
// @ts-ignore
import CryptoJS from "https://aistudiocdn.com/crypto-js@^4.2.0";

// In a real production app, this key should be an environment variable (process.env.ENCRYPTION_KEY)
// and ideally exchanged via a secure handshake or using Public Key Encryption (RSA).
// For this implementation, we use a strong shared secret.
const SECRET_KEY = "MY_CLINIC_SECURE_KEY_LIBYA_2024"; 

export const encryptData = (data: any): string => {
    try {
        // Convert data to JSON string
        const jsonString = JSON.stringify(data);
        // Encrypt using AES
        const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error("Encryption Error:", error);
        return "";
    }
};
