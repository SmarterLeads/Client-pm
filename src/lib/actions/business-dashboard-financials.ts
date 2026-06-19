"use server";

import { revalidatePath } from "next/cache";
import { canViewMonthlyFinancials } from "@/lib/auth/business-dashboard";
import { getTeamMember } from "@/lib/auth/session";
import type { MonthlyFinancialSaveInput } from "@/lib/business-dashboard/types";
import {
  getMonthlyFinancials,
} from "@/lib/queries/business-dashboard";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";

async function requireMonthlyFinancialsAccess() {
  const teamMember = await getTeamMember();
  if (!teamMember || !canViewMonthlyFinancials(teamMember)) {
    throw new Error("You don't have permission to manage monthly financials.");
  }

  return teamMember;
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
    const teamMember = await requireMonthlyFinancialsAccess();

    console.log("[saveMonthlyFinancial] called with:", year, month, data);
    console.log("[saveMonthlyFinancial] team member:", {
      id: teamMember.id,
      email: teamMember.email,
    });

    const payload = {
      year,
      month,
      cdn_sales: Number(data.cdnSales),
      cdn_expenses: Number(data.cdnExpenses),
      usd_sales: Number(data.usdSales),
      usd_expenses: Number(data.usdExpenses),
    };

    console.log("[saveMonthlyFinancial] upsert payload:", payload);

    const service = createServiceClient();
    const { data: saved, error } = await pm(service)
      .from("monthly_financials")
      .upsert(payload, { onConflict: "year,month" })
      .select("id, year, month, cdn_sales, cdn_expenses, usd_sales, usd_expenses")
      .single();

    console.log("[saveMonthlyFinancial] result:", { saved, error: error?.message ?? null });

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
