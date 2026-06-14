"use server";

import { revalidatePath } from "next/cache";
import { canViewMonthlyFinancials } from "@/lib/auth/business-dashboard";
import { getTeamMember } from "@/lib/auth/session";
import type { MonthlyFinancialSaveInput } from "@/lib/business-dashboard/types";
import {
  getMonthlyFinancials,
} from "@/lib/queries/business-dashboard";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

async function requireMonthlyFinancialsAccess() {
  const teamMember = await getTeamMember();
  if (!teamMember || !canViewMonthlyFinancials(teamMember)) {
    throw new Error("You don't have permission to manage monthly financials.");
  }

  return { teamMember, supabase: await createClient() };
}

export async function fetchMonthlyFinancials(year: number) {
  await requireMonthlyFinancialsAccess();
  return getMonthlyFinancials(year);
}

export async function saveMonthlyFinancial(
  year: number,
  month: number,
  data: MonthlyFinancialSaveInput,
): Promise<{ error?: string }> {
  if (month < 1 || month > 12) {
    return { error: "Invalid month." };
  }

  try {
    const { teamMember, supabase } = await requireMonthlyFinancialsAccess();

    const { error } = await pm(supabase)
      .from("monthly_financials")
      .upsert(
        {
          year,
          month,
          cdn_sales: data.cdnSales,
          cdn_expenses: data.cdnExpenses,
          usd_sales: data.usdSales,
          usd_expenses: data.usdExpenses,
          updated_by: teamMember.id,
        },
        { onConflict: "year,month" },
      );

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/business-dashboard");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to save monthly financials.",
    };
  }
}
