const Client = require("@notionhq/client").Client;
const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseID = process.env.NOTION_DATABASE_ID;
const fs = require("fs");

const getRecords = async () => {
  let records = { records: [] };
  let hasMore = true;
  let nextCursor = undefined;

  while (hasMore) {
    var result = (QueryDatabaseResponse = await notion.databases.query({
      database_id: databaseID,
      start_cursor: nextCursor ?? undefined,
    }));
    records.records = [...records.records, ...result.results];
    hasMore = result.has_more;
    nextCursor = result.next_cursor;
  }

  const jsonString = JSON.stringify(records);
  fs.writeFile("./records.json", jsonString, (err) => {
    if (err) throw new Error("Couldn't write records.json file");
    else console.log("Successfully fetched all the records. ");
  });
};

getRecords();
