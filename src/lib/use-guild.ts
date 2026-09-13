import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GuildRow = {
  id: string;
  guild_id: string;
  name: string;
  ticket_category_id: string | null;
  staff_role_id: string | null;
  log_channel_id: string | null;
  panel_channel_id: string | null;
  welcome_message: string;
};

export function useGuild() {
  return useQuery({
    queryKey: ["guild"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guilds")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as GuildRow | null) ?? null;
    },
  });
}
