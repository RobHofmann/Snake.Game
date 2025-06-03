var maxDeploymentNameLength = 64

func getDeploymentNamePrefix(resourceName string) string =>
  take('${deployment().name}', maxDeploymentNameLength - length('-${resourceName}'))

@export()
func generateDeploymentName(resourceName string) string =>
  format('{0}-{1}', getDeploymentNamePrefix(resourceName), resourceName)
