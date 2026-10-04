import { LaunchProps } from "@raycast/api";
import { NoteForm, NoteDraftValues } from "./components/note-form";
import { AccountRequired } from "./components/account-required";
export default function CreateNote({ draftValues }: LaunchProps<{ draftValues: NoteDraftValues }>) {
  return (
    <AccountRequired>
      <NoteForm root draftValues={draftValues} />
    </AccountRequired>
  );
}
