"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  updateClientOverviewFields,
  type ClientFormState,
} from "@/lib/actions/clients";
import { useActionToast } from "@/hooks/use-action-toast";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SheetFormActions,
  SheetFormBody,
  SheetFormField,
  sheetInputClassName,
} from "@/components/ui/sheet-form";
import type { Client } from "@/lib/types";

const initialState: ClientFormState = {};

type EditAddressSheetProps = {
  client: Pick<
    Client,
    | "id"
    | "address_street"
    | "address_city"
    | "address_province"
    | "address_postal_code"
    | "address_country"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditAddressSheet({
  client,
  open,
  onOpenChange,
}: EditAddressSheetProps) {
  const router = useRouter();

  const boundAction = async (
    prev: ClientFormState,
    formData: FormData,
  ): Promise<ClientFormState> => {
    const result = await updateClientOverviewFields(client.id, {
      address_street: String(formData.get("address_street") ?? "").trim() || null,
      address_city: String(formData.get("address_city") ?? "").trim() || null,
      address_province: String(formData.get("address_province") ?? "").trim() || null,
      address_postal_code:
        String(formData.get("address_postal_code") ?? "").trim() || null,
      address_country: String(formData.get("address_country") ?? "").trim() || null,
    });

    if (result.error) {
      return { error: result.error };
    }

    return { success: true };
  };

  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useActionToast(state, {
    successMessage: "Address updated",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit address</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="py-0">
            <SheetFormBody>
              {state.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}

              <SheetFormField label="Street">
                <Input
                  name="address_street"
                  defaultValue={client.address_street ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="City">
                <Input
                  name="address_city"
                  defaultValue={client.address_city ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Province">
                <Input
                  name="address_province"
                  defaultValue={client.address_province ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Postal code">
                <Input
                  name="address_postal_code"
                  defaultValue={client.address_postal_code ?? ""}
                  className={sheetInputClassName}
                />
              </SheetFormField>

              <SheetFormField label="Country">
                <Input
                  name="address_country"
                  defaultValue={client.address_country ?? "Canada"}
                  className={sheetInputClassName}
                />
              </SheetFormField>
            </SheetFormBody>
          </SheetBody>

          <SheetFooter>
            <SheetFormActions
              primaryLabel="Save"
              pending={pending}
              onCancel={() => onOpenChange(false)}
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
