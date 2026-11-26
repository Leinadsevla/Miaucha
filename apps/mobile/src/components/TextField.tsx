import { forwardRef, useState, type ComponentRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, withAlpha } from "@miaucha/shared";

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
      <Text className="mb-2 font-nunito-bold text-sm text-foreground">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        className="rounded-2xl bg-white px-4 font-sans text-base text-foreground"
        style={[
          { minHeight: 54, borderWidth: 1.5, borderColor, outlineWidth: 0 },
          // Anel suave no foco (laranja) ou no erro (vermelho), no lugar do contorno padrão do navegador.
          focused ? { boxShadow: `0px 0px 0px 4px ${withAlpha(error ? colors.lost : colors.primary, 0.18)}` } : null,
          style,
        ]}
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
