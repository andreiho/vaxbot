const { run, sendMessage } = require("../../app");

const centres = [
  "Øksnehallen",
  "Bella Center",
  "Ballerup",
  "Hillerød",
  "Birkerød",
];

module.exports = async (req, res) => {
  try {
     {
      query: { centreId },
    } = req;

    const day = new Date().getDay();
    const centre = centres[Number(centreId) - 1];

    // Only Tuesday and Wednesday for this centre
    if (centre === "Birkerød" && ![2, 3].includes(day)) {
      return res.json({ centre, skipped: true });
    }

    const start = Date.now();

    await run(centre);
    await sendMessage(`${centre} 💉`);

    const end = Date.now();
    const time = `${(end - start) / 1000} seconds`;

    res.json({ centre, time });
  } catch (error) {
    await sendMessage(`Error at centre ${req.query.centreId}: ${error}`);
    res.json({ error });
  }
};
