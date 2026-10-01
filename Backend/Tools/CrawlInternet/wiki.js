const headers = {
  "User-Agent": "indtekina_ai_assistant/1.0",
};

async function getWikipediaSummary(pageTitle) {
  const url = new URL("https://en.wikipedia.org/w/api.php");

  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
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

    if (pageId === "-1") {
      console.log(`Page "${pageTitle}" not found.`);
      return null;
    }

    const page = pages[pageId];

    return {
      title: page.title,
      summary: page.extract,
    };
  } catch (error) {
    console.error("Error fetching data from Wikipedia:", error);
    return null;
  }
}

const wikiToolDescription = {
  name: "getWikipediaSummary",
  description: "Get a summary of a Wikipedia page",
  parameters: {
    type: "object",
    properties: {
      pageTitle: {
        type: "string",
        description: "The title of the Wikipedia page",
      },
    },
    required: ["pageTitle"],
  },
}

module.exports = {
  getWikipediaSummary,
  wikiToolDescription
};
