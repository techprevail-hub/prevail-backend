// src/services/role-coach/service.service.js

import supabase from "../../services/supabaseClient.js";

const formatService = (service) => ({
  id: service.id,
  coachId: service.coach_id,
  name: service.name,
  description: service.description,
  sessionType: service.session_type,
  durationMinutes: service.duration_minutes,
  price: Number(service.price),
  currency: service.currency,
  isFree: service.is_free,
  isActive: service.is_active,
  createdAt: service.created_at,
  updatedAt: service.updated_at,
});

/**
 * Get coach services
 */
export const getCoachServicesService = async ({
  coachId,
  page = 1,
  limit = 10,
  search = "",
  status = "all",
}) => {
  try {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("coach_services")
      .select("*", { count: "exact" })
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search && search.trim()) {
      const searchTerm = search.trim();

      query = query.or(
        `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    }

    if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching coach services:", error);
      throw error;
    }

    return {
      services: (data || []).map(formatService),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    console.error("getCoachServicesService error:", error);
    throw error;
  }
};

/**
 * Get single service
 */
export const getCoachServiceByIdService = async ({
  serviceId,
  coachId,
}) => {
  try {
    const { data, error } = await supabase
      .from("coach_services")
      .select("*")
      .eq("id", serviceId)
      .eq("coach_id", coachId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching coach service:", error);
      throw error;
    }

    if (!data) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    return formatService(data);
  } catch (error) {
    console.error("getCoachServiceByIdService error:", error);
    throw error;
  }
};

/**
 * Create service
 */
export const createCoachServiceService = async ({
  coachId,
  name,
  description,
  sessionType,
  durationMinutes,
  price,
  currency = "INR",
  isFree = false,
  isActive = true,
}) => {
  try {
    const finalPrice = isFree ? 0 : Number(price);

    const insertData = {
      coach_id: coachId,
      name: name.trim(),
      description: description?.trim() || null,
      session_type: sessionType,
      duration_minutes: Number(durationMinutes),
      price: finalPrice,
      currency: currency.toUpperCase(),
      is_free: isFree,
      is_active: isActive,
    };

    const { data, error } = await supabase
      .from("coach_services")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Error creating coach service:", error);
      throw error;
    }

    return formatService(data);
  } catch (error) {
    console.error("createCoachServiceService error:", error);
    throw error;
  }
};

/**
 * Update service
 */
export const updateCoachServiceService = async ({
  serviceId,
  coachId,
  name,
  description,
  sessionType,
  durationMinutes,
  price,
  currency,
  isFree,
  isActive,
}) => {
  try {
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (sessionType !== undefined) {
      updateData.session_type = sessionType;
    }

    if (durationMinutes !== undefined) {
      updateData.duration_minutes = Number(durationMinutes);
    }

    if (isFree !== undefined) {
      updateData.is_free = isFree;
    }

    if (price !== undefined || isFree !== undefined) {
      updateData.price =
        isFree === true
          ? 0
          : Number(price);
    }

    if (currency !== undefined) {
      updateData.currency = currency.toUpperCase();
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("coach_services")
      .update(updateData)
      .eq("id", serviceId)
      .eq("coach_id", coachId)
      .select()
      .single();

    if (error) {
      console.error("Error updating coach service:", error);
      throw error;
    }

    if (!data) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    return formatService(data);
  } catch (error) {
    console.error("updateCoachServiceService error:", error);
    throw error;
  }
};

/**
 * Toggle service active/inactive
 */
export const toggleCoachServiceService = async ({
  serviceId,
  coachId,
  isActive,
}) => {
  try {
    const { data, error } = await supabase
      .from("coach_services")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceId)
      .eq("coach_id", coachId)
      .select()
      .single();

    if (error) {
      console.error("Error toggling coach service:", error);
      throw error;
    }

    if (!data) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    return formatService(data);
  } catch (error) {
    console.error("toggleCoachServiceService error:", error);
    throw error;
  }
};

/**
 * Soft delete service
 */
export const deleteCoachServiceService = async ({
  serviceId,
  coachId,
}) => {
  try {
    const { data, error } = await supabase
      .from("coach_services")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceId)
      .eq("coach_id", coachId)
      .select()
      .single();

    if (error) {
      console.error("Error deleting coach service:", error);
      throw error;
    }

    if (!data) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    return formatService(data);
  } catch (error) {
    console.error("deleteCoachServiceService error:", error);
    throw error;
  }
};