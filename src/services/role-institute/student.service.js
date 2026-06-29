import supabase from "../supabaseClient.js";

export const getStudentsService = async (query) => {

    try {

        const page = Number(query.page) || 1;

        const limit = Number(query.limit) || 10;

        const search = query.search || "";

        const department = query.department || "";

        const semester = query.semester || "";

        const status = query.status || "";

        const sortBy = query.sortBy || "created_at";

        const sortOrder = query.sortOrder === "asc";

        const from = (page - 1) * limit;

        const to = from + limit - 1;

        let studentQuery = supabase
            .from("students")
            .select("*", { count: "exact" });

        // Search
        if (search) {
            studentQuery = studentQuery.or(
                `full_name.ilike.%${search}%,email.ilike.%${search}%`
            );
        }

        // Department Filter
        if (department) {
            studentQuery = studentQuery.eq("department", department);
        }

        // Semester Filter
        if (semester) {
            studentQuery = studentQuery.eq("semester", semester);
        }

        // Status Filter
        if (status) {
            studentQuery = studentQuery.eq("status", status);
        }

        // Sorting
        studentQuery = studentQuery.order(sortBy, {
            ascending: sortOrder
        });

        // Pagination
        studentQuery = studentQuery.range(from, to);

        const { data, error, count } = await studentQuery;

        if (error) {

            throw error;

        }

        return {

            success: true,

            pagination: {

                currentPage: page,

                pageSize: limit,

                totalRecords: count,

                totalPages: Math.ceil(count / limit),

                hasNext: page < Math.ceil(count / limit),

                hasPrevious: page > 1

            },

            data

        };

    } catch (error) {

        throw error;

    }

};