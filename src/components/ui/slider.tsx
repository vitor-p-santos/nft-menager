import * as React from "react"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "radix-ui"

/**
 * Slider do Figma ("Faixa de preço"): trilho de 4px âmbar com pontas arredondadas e
 * thumbs de 21px âmbar com contorno ink de 3px (assets slider-track/slider-thumb).
 * `thumbLabels` dá o nome acessível de cada thumb (ex.: "Preço mínimo").
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-primary data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabels?.[index]}
          className="block size-[21px] shrink-0 cursor-grab rounded-full border-[3px] border-background bg-primary ring-ring/50 transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
