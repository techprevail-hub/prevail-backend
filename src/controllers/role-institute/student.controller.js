import {
  getStudentsService,
  getStudentByIdService,
  createStudentService,
  updateStudentService,
  deleteStudentService,
} from "../../services/role-institute/student.service.js";

/**
 * Get All Students
 */
export const getStudents = async (req, res) => {
  try {
    const result = await getStudentsService(req.query);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Students Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Get Student By ID
 */
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getStudentByIdService(id);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Student Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Create Student
 */
export const createStudent = async (req, res) => {
  try {
    const result = await createStudentService(req.body);

    return res.status(201).json(result);
  } catch (error) {
    console.error("Create Student Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Update Student
 */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await updateStudentService(id, req.body);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Update Student Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Delete Student
 */
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteStudentService(id);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Delete Student Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};