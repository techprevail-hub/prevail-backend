import axios from "axios";

export const fetchJobsFromAdzuna = async () => {
  const response = await axios.get(
    "https://api.adzuna.com/v1/api/jobs/in/search/1",
    {
      params: {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_APP_KEY,
        results_per_page: 20,
      },
    }
  );

  return response.data.results || [];
};