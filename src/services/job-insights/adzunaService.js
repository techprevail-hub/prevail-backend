import axios from "axios";

export const fetchJobsFromAdzuna = async () => {
  try {
    const response = await axios.get(
      "https://api.adzuna.com/v1/api/jobs/in/search/1",
      {
        params: {
          app_id: process.env.ADZUNA_APP_ID,
          app_key: process.env.ADZUNA_APP_KEY,
          what: "software developer",
          results_per_page: 20,
        },
      }
    );

    console.log("WHOLE RESPONSE:");
    console.log(response.data);

    console.log("RESULTS LENGTH:");
    console.log(response.data.results?.length);

    return response.data.results || [];
  } catch (error) {
    console.log("ERROR:");
    console.log(error.response?.data || error.message);

    return [];
  }
};