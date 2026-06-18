import { fetchJobsFromAdzuna } from "./adzunaService.js";

export const getJobInsightsService = async () => {

  const jobs = await fetchJobsFromAdzuna();

  console.log("Jobs Array Length:", jobs.length);

  return jobs;
};