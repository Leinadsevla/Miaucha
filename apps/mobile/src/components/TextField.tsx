import { forwardRef, useState, type ComponentRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@miaucha/shared";

type Props = Omit<TextInputProps, "className"> & {
  label: string;
  error?: string;
};

/** Campo com rótulo, borda de foco na cor da marca e erro logo abaixo. */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, Props>(function TextField({ label, error, onFocus, onBlur, style, ...input }, ref) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.lost : focused ? colors.primary : colors.border;
  return (
    <View>
      <Text className="mb-1.5 font-nunito-bold text-[13px] text-foreground">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        className="rounded-2xl bg-input px-4 font-sans text-base text-foreground"
        style={[{ minHeight: 50, borderWidth: 1.5, borderColor, backgroundColor: focused ? colors.white : colors.input }, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...input}
      />
      {error ? <Text className="mt-1.5 font-nunito-semibold text-xs text-lost">{error}</Text> : null}
    </View>
  );
});
