const Client = require("@notionhq/client").Client;
const notion = new Client({
  auth: process.env.NOTION_KEY,
});

const axios = require("axios");
const SEMANTIC_SCHOLAR_BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/";

const SEMANTIC_SCHOLAR_TIMEOUT = 3.5 * 1000;
const fs = require("fs");
const converter = require("json-2-csv");

const updateData = () => {
  fs.readFile("./records.json", "utf8", (err, jsonString) => {
    if (err) throw new Error("Error reading file from disk");

    try {
      const res = JSON.parse(jsonString);
      var requiredInformation = [];

      // Looping over each of the records
      res.records.forEach((page, index) => {
        setTimeout(() => {
          console.log(`Processing Record Number : ${index + 1} \n`);

          if (page.properties["ID_Type"].select != null) {
            var idType = page.properties["ID_Type"].select.name.toUpperCase();
            var id = page.properties.Identifier.rich_text[0].plain_text;
            var rec = {
              notionPageID: page.id,
              paperID: `${idType}:${id}`,
            };

            axios
              .get(SEMANTIC_SCHOLAR_BASE_URL + rec.paperID, {
                params: {
                  fields: "paperId,citations,references,citationCount,influentialCitationCount",
                },
              })
              .then((response) => {
                let c = [];
                let r = [];
                response.data.citations.forEach((d) => c.push(d.paperId));
                response.data.references.forEach((d) => r.push(d.paperId));
                var paperDetails = {
                  semanticScholarID: response.data.paperId,
                  citations: c,
                  references: r,
                  citationCount: response.data.citationCount || 0,
                  influencialCitationCount: response.data.influentialCitationCount || 0,
                };
                paperDetails["notionID"] = page.id;
                
                try {
                  paperDetails["affiliation"] = page.properties.Affiliation.rich_text[0].plain_text;
                } catch {
                  paperDetails["affiliation"] = null;
                }

                try {
                  paperDetails["authors"] = page.properties.Authors.rich_text[0].plain_text;
                } catch {
                  paperDetails["authors"] = null;
                }

                try {
                  paperDetails["venue"] = page.properties.Venue.rick_text[0].plain_text;
                } catch {
                  paperDetails["venue"] = null;
                }

                try {
                  paperDetails["otherLinks"] = page.properties["Other Links"].rick_text;
                } catch {
                  paperDetails["otherLinks"] = null;
                }
                
                try {
                  paperDetails["paperLink"] = page.properties.Paper.url;
                } catch {
                  paperDetails["paperLink"] = null;
                }

                try {
                  paperDetails["year"] = page.properties.Year.number;
                } catch {
                  paperDetails["year"] = null;
                }

                try {
                  paperDetails["title"] = page.properties.Title.title[0].plain_text;
                } catch {
                  paperDetails["title"] = null;
                }
                requiredInformation.push(paperDetails);

                // Update citation count
                notion.pages
                .update({
                  page_id: rec.notionPageID,
                  properties: {
                    "Citation Count": { number: paperDetails.citationCount },
                    "Influential Citation Count": { number: paperDetails.influencialCitationCount },
                  },
                })
              
              })
              .catch((err) => {
                console.log("Paper doesn't exist in Semantic Scholar.");
              });
          } else
            console.log("The identifiers for this paper haven't been set.");
        }, SEMANTIC_SCHOLAR_TIMEOUT * (index + 1));
      });

      setTimeout(() => {
        converter.json2csv(requiredInformation, (err, csv) => {
          if (err) throw err;
          fs.writeFileSync("./database.csv", csv);
        });
      }, SEMANTIC_SCHOLAR_TIMEOUT * (res.records.length + 5));
    } catch (err) {
      throw new Error("Error parsing JSON string");
    }
  });
};

updateData();
