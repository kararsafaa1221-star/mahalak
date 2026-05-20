import axios from "axios";

async function testFormat(name, config) {
  try {
    const response = await axios.post("http://localhost:3000/api/otp", config.data, config.options);
    console.log("SUCCESS", name, response.status, response.data);
  } catch (e) {
    if (e.response) {
      console.log("FAIL", name, e.response.status, typeof e.response.data === 'string' ? e.response.data.slice(0, 500).replace(/\n/g, '') : e.response.data);
    } else {
      console.log("FAIL", name, e.message);
    }
  }
}

async function test() {
  await testFormat("Local test", {
    data: { phone: "9647800000000", text: "hello" },
    options: {}
  });
}
test();
