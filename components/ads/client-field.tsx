"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NEW = "__new__";

/** Client / company picker for the ad forms. Lists already-added clients with a
 *  "Create new" option first, and reveals a text input when creating one. The
 *  resolved value is submitted under the `client` form field. */
export function ClientField({
  id,
  clients,
  defaultValue = null,
}: {
  id: string;
  clients: string[];
  defaultValue?: string | null;
}) {
  const initial = defaultValue?.trim() ?? "";
  const known = initial !== "" && clients.includes(initial);

  // `choice` is either an existing client name or the NEW sentinel.
  const [choice, setChoice] = useState(known ? initial : NEW);
  // Free-text name when creating a new client (prefilled if the ad's current
  // client isn't in the list for some reason).
  const [newName, setNewName] = useState(known ? "" : initial);

  const creating = choice === NEW;
  const client = creating ? newName : choice;

  return (
    <div className="flex flex-col gap-2">
      {/* Resolved value submitted with the form. */}
      <input type="hidden" name="client" value={client} />

      <Select value={choice} onValueChange={(v) => setChoice(v as string)}>
        <SelectTrigger id={id} className="h-10 w-full">
          <SelectValue>
            {(value: string) =>
              value === NEW ? (
                <span className="font-semibold">Create new client</span>
              ) : (
                value
              )
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NEW} className="font-semibold">
            <Plus className="size-4" strokeWidth={1.5} />
            Create new client
          </SelectItem>
          {clients.length > 0 && <SelectSeparator />}
          {clients.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {creating && (
        <Input
          aria-label="New client name"
          placeholder="Acme Inc."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus={initial === ""}
        />
      )}
    </div>
  );
}
