import { useRef, useState, type ComponentRef } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors, overlay } from "@miaucha/shared";
import { IconButton } from "./IconButton";

type Props = {
  urls: string[];
  /** Nome do pet, para a descrição de cada foto ("Foto 1 de 3 de Thor"). */
  label: string;
  height: number;
  /** Setas anterior/próxima. Padrão: só no navegador, onde o mouse não arrasta o carrossel. */
  arrows?: boolean;
};

/**
 * Fotos lado a lado, uma por vez. A largura vem do próprio espaço (na web o app fica numa coluna de
 * 480 px, não na largura da janela) e o contador mostra a posição.
 */
export function PhotoCarousel({ urls, label, height, arrows = Platform.OS === "web" }: Props) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const many = urls.length > 1;

  function go(next: number) {
    const target = Math.max(0, Math.min(urls.length - 1, next));
    setIndex(target);
    scroller.current?.scrollTo({ x: target * width, animated: true });
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => width && setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {urls.map((url, i) => (
          <Image
            key={url}
            accessibilityLabel={`Foto ${i + 1} de ${urls.length} de ${label}`}
            source={{ uri: url }}
            contentFit="cover"
            transition={200}
            style={{ width: width || 1, height }}
          />
        ))}
      </ScrollView>

      {many ? (
        <View pointerEvents="none" className="absolute left-0 right-0 items-center" style={{ top: 16 }}>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: overlay.photo }}>
            <Text className="font-nunito-bold text-xs text-white">
              {index + 1}/{urls.length}
            </Text>
          </View>
        </View>
      ) : null}

      {many && arrows ? (
        <>
          <View className="absolute left-3" style={{ top: height / 2 - 22 }}>
            <IconButton label="Foto anterior" tone="white" icon={<ChevronLeft size={22} color={colors.foreground} />} onPress={() => go(index - 1)} disabled={index === 0} />
          </View>
          <View className="absolute right-3" style={{ top: height / 2 - 22 }}>
            <IconButton
              label="Próxima foto"
              tone="white"
              icon={<ChevronRight size={22} color={colors.foreground} />}
              onPress={() => go(index + 1)}
              disabled={index === urls.length - 1}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}
