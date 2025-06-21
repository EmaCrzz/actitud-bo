import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MembershipTranslation,
  type MembershipType,
} from "@/assistance/consts";
import { Skeleton } from "@/components/ui/skeleton";
import { HybridSelect } from "@/components/ui/select-hybrid";

type Membership = {
  id: number;
  type: MembershipType;
};

const getMemberships = async () => {
  const supabase = createClient();
  const { data } = (await supabase.from("types_memberships").select()) as {
    data: Membership[];
  };
  return data || [];
};

interface Props {
  name?: string;
  defaultValue?: string;
  className?: string;
  isInvalid?: boolean;
  helperText?: string;
}

export default function SelectMembershipHybrid({
  name = "membership_type",
  defaultValue,
  className,
  helperText,
  isInvalid = false,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    getMemberships().then((data) => {
      setMemberships(data);
      setIsLoading(false);
    });
  }, []);

  const options = memberships.map((membership) => ({
    value: membership.type,
    label: MembershipTranslation[membership.type],
  }));

  if (isLoading) {
    return <Skeleton className="h-[54px] w-full" />;
  }

  return (
    <HybridSelect
      helperText={helperText}
      isInvalid={isInvalid}
      options={options}
      name={name}
      defaultValue={defaultValue}
      placeholder="Selecciona un tipo de membresía"
      className={className}
    />
  );
}
