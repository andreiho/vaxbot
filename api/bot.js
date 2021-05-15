const { run } = require("../app");

module.exports = async (req, res) => {
  try {
    await run();
    res.status(200).json({ status: "OK" });
  } catch (error) {
    res.status(200).json({ status: "OK", error });
  }
};
