import { forwardRef, useState, type ComponentRef, type ReactNode } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
import { colors, withAlpha } from "@miaucha/shared";

type Props = Omit<TextInputProps, "className"> & {
  label: string;
  error?: string;
  /** Ajuda mostrada embaixo do campo enquanto não há erro (ex.: a regra da senha). */
  hint?: string;
  /** Ícone à esquerda do texto. */
  icon?: ReactNode;
};

/**
 * Campo com rótulo, ícone opcional, anel de foco na cor da marca e erro logo abaixo.
 * Campo de senha (`secureTextEntry`) ganha o botão de mostrar/ocultar.
 */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, Props>(function TextField(
  { label, error, hint, icon, onFocus, onBlur, style, secureTextEntry, multiline, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ring = error ? colors.lost : colors.brand;
  return (
    <View>
      <Text className="mb-1.5 font-ui-semibold text-sm text-foreground">{label}</Text>
      <View
        testID={`field-${label}`}
        className="flex-row rounded-[14px] bg-white"
        style={[
          { minHeight: 52, alignItems: multiline ? "flex-start" : "center", borderWidth: 1.5, borderColor: error ? colors.lost : focused ? colors.brand : colors.border },
          focused ? { boxShadow: `0px 0px 0px 3px ${withAlpha(ring, 0.16)}` } : null,
        ]}
      >
        {icon ? <View className="pl-3.5">{icon}</View> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 px-3.5 font-sans text-base text-foreground"
          multiline={multiline}
          secureTextEntry={secureTextEntry ? !visible : undefined}
          // O anel de foco é do contêiner; o contorno do navegador sairia por dentro dele.
          style={[{ minHeight: 49, outlineWidth: 0 }, multiline ? { paddingVertical: 12, textAlignVertical: "top" } : null, style]}
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
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
            onPress={() => setVisible((v) => !v)}
            hitSlop={4}
            style={({ pressed }) => ({ width: 44, height: 44, marginRight: 3, alignItems: "center", justifyContent: "center", borderRadius: 12, opacity: pressed ? 0.6 : 1 })}
          >
            {visible ? <EyeOff size={20} color={colors.mutedForeground} /> : <Eye size={20} color={colors.mutedForeground} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <AlertCircle size={14} color={colors.lostDeep} />
          <Text className="flex-1 font-ui-medium text-sm text-lost-deep">{error}</Text>
        </View>
      ) : hint ? (
        <Text className="mt-1.5 font-sans text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
});
