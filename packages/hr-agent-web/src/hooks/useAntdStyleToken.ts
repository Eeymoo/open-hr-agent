import { theme } from 'antd';

export function useAntdStyleToken() {
  const { token } = theme.useToken();

  return {
    token,
    colors: {
      primary: token.colorPrimary,
      success: token.colorSuccess,
      warning: token.colorWarning,
      error: token.colorError,
      info: token.colorInfo,
      text: token.colorText,
      textSecondary: token.colorTextSecondary,
      textTertiary: token.colorTextTertiary,
      textDisabled: token.colorTextDisabled,
      bgContainer: token.colorBgContainer,
      bgLayout: token.colorBgLayout,
      bgElevated: token.colorBgElevated,
      border: token.colorBorder,
      borderSecondary: token.colorBorderSecondary
    },
    spacing: {
      xs: token.paddingXXS,
      sm: token.paddingXS,
      md: token.paddingSM,
      lg: token.paddingMD,
      xl: token.paddingLG,
      xxl: token.paddingXL
    },
    borderRadius: token.borderRadius,
    fontSize: token.fontSize,
    fontFamily: token.fontFamily
  };
}
