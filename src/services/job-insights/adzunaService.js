import axios from "axios";

export const fetchJobsFromAdzuna = async () => {
  try {

    console.log("APP ID:", process.env.ADZUNA_APP_ID);
    console.log("APP KEY:", process.env.ADZUNA_APP_KEY);

    const response = await axios.get(
      "https://api.adzuna.com/v1/api/jobs/in/in/search/1",
      {
        params: {
          app_id: process.env.ADZUNA_APP_ID,
          app_key: process.env.ADZUNA_APP_KEY,
          results_per_page: 20,
          what: "software developer",
        },
      }
    );

    console.log("TOTAL JOBS:", response.data.results?.length);

    return response.data.results || [];

  } catch (error) {

    console.log("===== ADZUNA ERROR =====");
    console.log(error.response?.data || error.message);

    return [];
  }
};