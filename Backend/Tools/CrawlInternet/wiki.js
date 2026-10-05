const headers = {
    "User-Agent": "indtekina_ai_assistant/1.0",
};

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

/**
 * Search Wikipedia for pages relevant to a query.
 */
async function searchWikipedia(query, limit = 5) {
    const url = new URL(WIKIPEDIA_API);

    url.search = new URLSearchParams({
        action: "query",
        format: "json",
        list: "search",
        srsearch: query,
        srlimit: String(limit),
        srprop: "snippet",
    });

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(
                `Wikipedia API returned ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();
        console.log(data)

        return {
            success: true,
            query,
            results: data.query.search.map((page) => ({
                title: page.title,
                snippet: page.snippet
                    .replace(/<[^>]*>/g, "")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&amp;/g, "&"),
            })),
        };
    } catch (error) {
        console.error("Error searching Wikipedia:", error);

        return {
            success: false,
            error: error.message,
            results: [],
        };
    }
}


/**
 * Get the introductory summary of a Wikipedia page.
 */
async function getWikipediaSummary(pageTitle) {
    const url = new URL(WIKIPEDIA_API);

    url.search = new URLSearchParams({
        action: "query",
        format: "json",
        prop: "extracts",
        exintro: "1",
        explaintext: "1",
        redirects: "1",
        titles: pageTitle,
    });

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(
                `Wikipedia API returned ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();

        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        console.log(data)

        if (pageId === "-1") {
            return {
                success: false,
                error: `Wikipedia page "${pageTitle}" not found.`,
            };
        }

        const page = pages[pageId];

        return {
            success: true,
            title: page.title,
            summary: page.extract || "",
        };
    } catch (error) {
        console.error("Error fetching data from Wikipedia:", error);

        return {
            success: false,
            error: error.message,
        };
    }
}


/**
 * Gemini tool definitions.
 */
const wikiToolDescriptions = [
    {
        name: "searchWikipedia",
        description:
            "Search Wikipedia for pages relevant to a factual question or claim. Use this when you do not know the exact Wikipedia page title.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description:
                        "The topic, concept, person, event, or factual claim to search for.",
                },
                limit: {
                    type: "integer",
                    description:
                        "Maximum number of results to return. Usually 3 to 5 is sufficient.",
                },
            },
            required: ["query"],
        },
        run: searchWikipedia
    },

    {
        name: "getWikipediaSummary",
        description:
            "Get the introductory summary of a specific Wikipedia page. Use this after searching when a particular page appears relevant to the claim being investigated.",
        parameters: {
            type: "object",
            properties: {
                pageTitle: {
                    type: "string",
                    description:
                        "The title of the Wikipedia page to retrieve.",
                },
            },
            required: ["pageTitle"],
        },
        run: getWikipediaSummary
    },
];


module.exports = wikiToolDescriptions;