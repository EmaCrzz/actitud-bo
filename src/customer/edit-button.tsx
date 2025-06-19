import PencilIcon from "@/components/icons/pencil";
import { Button } from "@/components/ui/button";


export default function EditButton() {
  return (
    <Button variant="ghost" size="icon" className="size-6">
      <PencilIcon className="size-6" />
    </Button>
  );
}
