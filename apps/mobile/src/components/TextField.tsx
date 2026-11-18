import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@miaucha/shared";
import { cn } from "@/lib/cn";

type Props = Omit<TextInputProps, "className"> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...input }: Props) {
  return (
    <View>
      <Text className="mb-1 font-nunito-semibold text-xs text-muted-foreground">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        className={cn(
          "rounded-2xl border bg-input px-4 py-3 font-sans text-sm text-foreground",
          error ? "border-lost" : "border-transparent focus:border-primary",
        )}
        {...input}
      />
      {error ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{error}</Text> : null}
    </View>
  );
}
