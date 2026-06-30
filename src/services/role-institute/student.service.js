import supabase from "../supabaseClient.js";

/**
 * Get All Students
 */
export const getStudentsService = async (query) => {
  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const search = query.search || "";
    const department = query.department || "";
    const semester = query.semester || "";
    const status = query.status || "";

    const sortBy = query.sortBy || "created_at";
    const ascending = query.sortOrder === "asc";

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
      ascending,
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
        hasPrevious: page > 1,
      },

      data,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get Student By ID
 */
export const getStudentByIdService = async (id) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Create Student
 */
export const createStudentService = async (body) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .insert([body])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: "Student created successfully.",
      data,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Update Student
 */
export const updateStudentService = async (id, body) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: "Student updated successfully.",
      data,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Student
 */
export const deleteStudentService = async (id) => {
  try {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: "Student deleted successfully.",
    };
  } catch (error) {
    throw error;
  }
};