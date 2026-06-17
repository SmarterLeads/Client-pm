import Link from "next/link";
import {
  formatAttendeeLabel,
  formatInteractionWithLine,
} from "@/lib/interactions/display";
import type { InteractionRow } from "@/lib/interactions/types";

type InteractionPeopleProps = {
  item: InteractionRow;
  clientId?: string;
  compact?: boolean;
};

function contactHref(clientId: string) {
  return `/contacts?client=${clientId}`;
}

export function InteractionPeopleSummary({
  item,
  clientId,
}: InteractionPeopleProps) {
  const withLine = formatInteractionWithLine(item.contacts, item.attendees);
  if (!withLine) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {item.contacts.length > 0 && clientId ? (
        <>
          With:{" "}
          {item.contacts.map((contact, index) => (
            <span key={contact.id}>
              {index > 0 ? ", " : null}
              <Link
                href={contactHref(clientId)}
                className="font-medium text-foreground hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {contact.name}
              </Link>
            </span>
          ))}
          {item.attendees.length > 0 ? (
            <span>
              {" "}
              +{" "}
              {item.attendees.length === 1
                ? "1 attendee"
                : `${item.attendees.length} attendees`}
            </span>
          ) : null}
        </>
      ) : (
        withLine
      )}
    </p>
  );
}

export function InteractionPeopleDetails({
  item,
  clientId,
}: InteractionPeopleProps) {
  const hasContacts = item.contacts.length > 0;
  const hasAttendees = item.attendees.length > 0;

  if (!hasContacts && !hasAttendees) return null;

  return (
    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
      {hasContacts ? (
        <p>
          <span className="font-medium text-foreground">Contacts:</span>{" "}
          {clientId ? (
            item.contacts.map((contact, index) => (
              <span key={contact.id}>
                {index > 0 ? ", " : null}
                <Link
                  href={contactHref(clientId)}
                  className="hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {contact.name}
                </Link>
              </span>
            ))
          ) : (
            item.contacts.map((contact) => contact.name).join(", ")
          )}
        </p>
      ) : null}
      {hasAttendees ? (
        <p>
          <span className="font-medium text-foreground">Also attended:</span>{" "}
          {item.attendees.map((attendee) => formatAttendeeLabel(attendee)).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
