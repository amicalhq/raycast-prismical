import { Notes } from "./components/notes";
import { AccountRequired } from "./components/account-required";
export default function Command() {
  return (
    <AccountRequired>
      <Notes append />
    </AccountRequired>
  );
}
