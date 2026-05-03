import supabase from "../services/supabaseClient.js";


// ✅ SYNC USER (OAuth login)
export const syncUser = async (req, res) => {
  try {
    const { id, email, name } = req.body;

    if (!id || !email) {
      return res.status(400).json({ message: "Invalid user data" });
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    // If user already exists
    if (existingUser) {
      return res.json({
        user: existingUser,
        isNew: false,
      });
    }

    // Insert new user (role = null initially)
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          id,
          email,
          name,
          role: null,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      user: data[0],
      isNew: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ UPDATE USER ROLE
export const updateUserRole = async (req, res) => {
  try {
    const { id, role } = req.body;

    if (!id || !role) {
      return res.status(400).json({ message: "User ID and role required" });
    }

    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json({
      message: "Role updated successfully",
      user: data[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ GET ALL USERS
export const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ GET USER BY ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ UPDATE USER (optional general update)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ name, email })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json({
      message: "User updated successfully",
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ✅ DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};