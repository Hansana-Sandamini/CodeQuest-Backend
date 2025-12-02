import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY as string
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com"

export interface TestCase {
    input: string
    expectedOutput: string
}

export async function executeCode(
    sourceCode: string,
    languageId: number,
    testCases: TestCase[]
): Promise<{ passed: boolean; results: any[] }> {
    const results = []
    let allPassed = true

    for (const { input, expectedOutput } of testCases) {
        // Submit code for execution
        const submitResponse = await axios.post(
            `https://${RAPIDAPI_HOST}/submissions`,
            {
                source_code: sourceCode,
                language_id: languageId,
                stdin: input,
                expected_output: expectedOutput.trim(),
            },
            {
                headers: {
                    "x-rapidapi-key": RAPIDAPI_KEY,
                    "x-rapidapi-host": RAPIDAPI_HOST,
                    "Content-Type": "application/json",
                },
            }
        )

        const token = submitResponse.data.token

        // Poll for result (wait until processing is done)
        let statusResponse
        let attempts = 0
        do {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s
            statusResponse = await axios.get(
                `https://${RAPIDAPI_HOST}/submissions/${token}?base64_encoded=false&fields=*`,
                {
                    headers: {
                        "x-rapidapi-key": RAPIDAPI_KEY,
                        "x-rapidapi-host": RAPIDAPI_HOST,
                    },
                }
            )
            attempts++;
            if (attempts > 10) throw new Error("Timeout waiting for Judge0 result");
        } while (statusResponse.data.status.id <= 2) // 1: in queue, 2: processing

        const result = statusResponse.data
        const passed = result.status.id === 3 && result.stdout?.trim() === expectedOutput.trim()
        results.push(result)
        if (!passed) allPassed = false
    }

    return { passed: allPassed, results }
}

// Map Language names to Judge0 language IDs 
export const languageToId: { [key: string]: number } = {
    "JavaScript": 63,
    "Python": 71,
    "Java": 62,
    "C": 50, 
    "C++": 54,
    "C#": 51,   
    "PHP": 68,
    "Ruby": 72,
    "Perl": 53,
    "Kotlin": 78,
    "Go": 60,
    "Rust": 73,
    "Swift": 83,
    "R": 80,
    "Dart": 75
}
