import supabase from "../supabaseClient.js";

/**
 * Default notification settings
 */
const DEFAULT_NOTIFICATION_SETTINGS = {
  student: true,
  coach: true,
  placement: true,
  careerProgress: true,
  nps: true,
  system: true,
};

/**
 * Default feature settings
 */
const DEFAULT_FEATURE_SETTINGS = {
  students: true,
  coaches: true,
  careerProgress: true,
  placement: true,
  nps: true,
  reporting: true,
};

/**
 * Get Institute Settings
 *
 * If settings do not exist for the institute,
 * default settings will be created automatically.
 */
export const getInstituteSettingsService = async (
  instituteId
) => {
  try {
    if (!instituteId) {
      throw new Error("Institute ID is required.");
    }

    const { data, error } = await supabase
      .from("institute_settings")
      .select(
        "id, institute_id, notification_settings, feature_settings, created_at, updated_at"
      )
      .eq("institute_id", instituteId)
      .maybeSingle();

    if (error) {
      console.error(
        "❌ Get institute settings error:",
        error
      );

      throw new Error(
        "Failed to fetch institute settings."
      );
    }

    /**
     * Create default settings for first-time access
     */
    if (!data) {
      const { data: newSettings, error: createError } =
        await supabase
          .from("institute_settings")
          .insert({
            institute_id: instituteId,
            notification_settings:
              DEFAULT_NOTIFICATION_SETTINGS,
            feature_settings:
              DEFAULT_FEATURE_SETTINGS,
          })
          .select(
            "id, institute_id, notification_settings, feature_settings, created_at, updated_at"
          )
          .single();

      if (createError) {
        console.error(
          "❌ Create default institute settings error:",
          createError
        );

        throw new Error(
          "Failed to create default institute settings."
        );
      }

      return newSettings;
    }

    return data;
  } catch (error) {
    console.error(
      "❌ getInstituteSettingsService error:",
      error
    );

    throw error;
  }
};

/**
 * Update Institute Notification Settings
 *
 * Only notification settings are changed.
 * Existing feature settings are preserved.
 */
export const updateInstituteNotificationSettingsService =
  async (
    instituteId,
    notificationSettings
  ) => {
    try {
      if (!instituteId) {
        throw new Error("Institute ID is required.");
      }

      if (
        !notificationSettings ||
        typeof notificationSettings !== "object" ||
        Array.isArray(notificationSettings)
      ) {
        throw new Error(
          "Invalid notification settings."
        );
      }

      /**
       * Check whether settings already exist.
       */
      const { data: existingSettings, error: findError } =
        await supabase
          .from("institute_settings")
          .select(
            "id, notification_settings, feature_settings"
          )
          .eq("institute_id", instituteId)
          .maybeSingle();

      if (findError) {
        console.error(
          "❌ Find institute settings error:",
          findError
        );

        throw new Error(
          "Failed to find institute settings."
        );
      }

      /**
       * If no settings exist, create them.
       */
      if (!existingSettings) {
        const { data, error } = await supabase
          .from("institute_settings")
          .insert({
            institute_id: instituteId,
            notification_settings:
              notificationSettings,
            feature_settings:
              DEFAULT_FEATURE_SETTINGS,
          })
          .select(
            "id, institute_id, notification_settings, feature_settings, created_at, updated_at"
          )
          .single();

        if (error) {
          console.error(
            "❌ Create notification settings error:",
            error
          );

          throw new Error(
            "Failed to update notification settings."
          );
        }

        return data;
      }

      /**
       * Update only notification settings.
       * Feature settings remain unchanged.
       */
      const { data, error } = await supabase
        .from("institute_settings")
        .update({
          notification_settings:
            notificationSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("institute_id", instituteId)
        .select(
          "id, institute_id, notification_settings, feature_settings, created_at, updated_at"
        )
        .single();

      if (error) {
        console.error(
          "❌ Update notification settings error:",
          error
        );

        throw new Error(
          "Failed to update notification settings."
        );
      }

      return data;
    } catch (error) {
      console.error(
        "❌ updateInstituteNotificationSettingsService error:",
        error
      );

      throw error;
    }
  };

/**
 * Update Institute Feature Settings
 *
 * Only feature settings are changed.
 * Existing notification settings are preserved.
 */
export const updateInstituteFeatureSettingsService =
  async (
    instituteId,
    featureSettings
  ) => {
    try {
      if (!instituteId) {
        throw new Error("Institute ID is required.");
      }

      if (
        !featureSettings ||
        typeof featureSettings !== "object" ||
        Array.isArray(featureSettings)
      ) {
        throw new Error(
          "Invalid feature settings."
        );
      }

      /**
       * Check whether settings already exist.
       */
      const { data: existingSettings, error: findError } =
        await supabase
          .from("institute_settings")
          .select(
            "id, notification_settings, feature_settings"
          )
          .eq("institute_id", instituteId)
          .maybeSingle();

      if (findError) {
        console.error(
          "❌ Find institute settings error:",
          findError
        );

        throw new Error(
          "Failed to find institute settings."
        );
      }

      /**
       * If no settings exist, create them.
       */
      if (!existingSettings) {
        const { data, error } = await supabase
          .from("institute_settings")
          .insert({
            institute_id: instituteId,
            notification_settings:
              DEFAULT_NOTIFICATION_SETTINGS,
            feature_settings:
              featureSettings,
          })
          .select(
            "id, institute_id, notification_settings, feature_settings, created_at, updated_at"
          )
          .single();

        if (error) {
          console.error(
            "❌ Create feature settings error:",
            error
          );

          throw new Error(
            "Failed to update feature settings."
          );
        }

        return data;
      }

      /**
       * Update only feature settings.
       * Notification settings remain unchanged.
       */
      const { data, error } = await supabase
        .from("institute_settings")
        .update({
          feature_settings: featureSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("institute_id", instituteId)
        .select(
          "id, institute_id, notification_settings, feature_settings, created_at, updated_at"
        )
        .single();

      if (error) {
        console.error(
          "❌ Update feature settings error:",
          error
        );

        throw new Error(
          "Failed to update feature settings."
        );
      }

      return data;
    } catch (error) {
      console.error(
        "❌ updateInstituteFeatureSettingsService error:",
        error
      );

      throw error;
    }
  };