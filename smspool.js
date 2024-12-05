const axios = require("axios");
const FormData = require("form-data"); // Handles form data

class SMSPool {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.API_URL = "https://api.smspool.net/purchase/sms";
    }

    /**
     * Purchases a phone number using the SMSPool API.
     *
     * @param {object} options - Options for purchasing a number.
     * @param {string} options.country - Country code (e.g., "US").
     * @param {string} options.service - Service identifier (e.g., "1227" for YouTube).
     * @param {string} [options.pool] - Optional pool selection.
     * @param {string} [options.max_price] - Maximum price (optional).
     * @param {string} [options.pricing_option] - Pricing option (optional).
     * @param {string} [options.quantity] - Quantity of numbers (optional).
     * @param {string} [options.areacode] - Area code preference (optional).
     * @param {string} [options.exclude] - Exclude certain numbers (optional).
     * @param {string} [options.create_token] - Optional token creation.
     * @returns {Promise<object>} The API response.
     */
    async orderSMS(options) {
        const formData = new FormData();
        formData.append("key", this.apiKey);
        formData.append("country", options.country); // 1 for United States
        formData.append("service", options.service); // 1227 for YouTube
        if (options.pool) formData.append("pool", options.pool);
        if (options.max_price) formData.append("max_price", options.max_price);
        if (options.pricing_option)
            formData.append("pricing_option", options.pricing_option);
        if (options.quantity) formData.append("quantity", options.quantity);
        if (options.areacode) formData.append("areacode", options.areacode);
        if (options.exclude) formData.append("exclude", options.exclude);
        if (options.create_token)
            formData.append("create_token", options.create_token);

        try {
            const response = await axios.post(this.API_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });

            // Extract the phone number from the response data
            if (response.data && response.data.success === 1) {
                return [response.data.phonenumber, response.data.order_id]; // Return the phone number and order_id
            } else {
                throw new Error(
                    response.data.message || "Failed to purchase phone number"
                );
            }
        } catch (error) {
            throw new Error(`Error purchasing phone number: ${error.message}`);
        }
    }

    /**
     * Checks the SMS status for the given order ID.
     *
     * @param {string} orderId - The order ID you received when purchasing the phone number.
     * @returns {Promise<object>} The API response containing the SMS status.
     */
    async checkSmsStatus(orderId) {
        const formData = new URLSearchParams();
        formData.append("orderid", orderId);
        formData.append("key", this.apiKey);

        try {
            const response = await axios.post(
                "https://api.smspool.net/sms/check",
                formData,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error("Error checking SMS status:", error.message);
            throw error;
        }
    }

    /**
     * Waits for the SMS code by polling the SMS status.
     *
     * @param {string} orderId - The order ID associated with the phone number.
     * @param {number} maxRetries - Maximum number of polling attempts.
     * @param {number} pollInterval - Interval in milliseconds to poll the status (e.g., 5000 for 5 seconds).
     * @returns {Promise<string>} The SMS code if received, or an error message if not.
     */
    async waitForSmsCode(orderId, maxRetries = 10, pollInterval = 10000) {
        let retries = 0;

        while (retries < maxRetries) {
            console.log(
                `Checking for SMS... Attempt ${retries + 1}/${maxRetries}`
            );

            // Check the status of the SMS
            const statusResponse = await this.checkSmsStatus(orderId);

            // If the status is 3, it means the SMS is ready
            if (statusResponse.status === 3) {
                console.log("SMS Code received:", statusResponse.sms);
                return statusResponse.sms; // Return the SMS code
            }

            // If the status is 1, the SMS is still pending, so we wait and retry
            if (statusResponse.status === 1) {
                console.log(
                    `SMS is still pending. Time left: ${statusResponse.time_left} seconds.`
                );
                if (statusResponse.time_left <= 0) {
                    throw new Error(
                        "The order expired before the SMS could be received."
                    );
                }
            }

            // Wait before checking again
            retries++;
            await new Promise((resolve) => setTimeout(resolve, pollInterval)); // Wait for the poll interval
        }

        throw new Error(
            "Failed to receive SMS code within the allowed retries."
        );
    }
}

module.exports = SMSPool;
